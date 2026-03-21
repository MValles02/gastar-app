import PropTypes from 'prop-types';

export const childrenPropType = PropTypes.node;
export const classNamePropType = PropTypes.string;
export const iconPropType = PropTypes.elementType;

export const optionShape = PropTypes.shape({
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  icon: iconPropType,
  tone: PropTypes.string,
});

export const backLinkShape = PropTypes.shape({
  to: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

export const accountShape = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  balance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  currency: PropTypes.string,
});

export const categoryShape = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  icon: PropTypes.string,
});

export const transactionShape = PropTypes.shape({
  id: PropTypes.string,
  type: PropTypes.string.isRequired,
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  date: PropTypes.string.isRequired,
  description: PropTypes.string,
  account: accountShape,
  accountId: PropTypes.string,
  category: categoryShape,
  categoryId: PropTypes.string,
  transferTo: PropTypes.string,
  transferToAccount: accountShape,
});

export const summaryShape = PropTypes.shape({
  totalBalance: PropTypes.number.isRequired,
  totalIncome: PropTypes.number.isRequired,
  totalExpenses: PropTypes.number.isRequired,
  netFlow: PropTypes.number,
  accounts: PropTypes.arrayOf(accountShape).isRequired,
});

export const filtersShape = PropTypes.shape({
  accountId: PropTypes.string,
  categoryId: PropTypes.string,
  type: PropTypes.string,
  from: PropTypes.string,
  to: PropTypes.string,
  page: PropTypes.number,
  limit: PropTypes.number,
});
